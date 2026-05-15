use crate::error::ApiError;
use serde_json::json;

pub struct GroqApiClient {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl GroqApiClient {
    pub fn new(api_key: String) -> Self {
        Self::new_with_base_url(api_key, "https://api.groq.com".to_string())
    }

    pub fn new_with_base_url(api_key: String, base_url: String) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .expect("Failed to create Groq HTTP client");
        Self { client, api_key, base_url }
    }

    pub async fn chat_completion(&self, prompt: &str) -> Result<String, ApiError> {
        let body = json!({
            "model": "llama-3.1-8b-instant",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert League of Legends analyst. Always respond with valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 1024,
            "response_format": { "type": "json_object" }
        });

        let resp = self
            .client
            .post(format!("{}/openai/v1/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    ApiError::Timeout
                } else {
                    ApiError::NetworkError {
                        message: e.to_string(),
                    }
                }
            })?;

        if !resp.status().is_success() {
            return Err(ApiError::NetworkError {
                message: format!("Groq API error: HTTP {}", resp.status().as_u16()),
            });
        }

        let data: serde_json::Value = resp.json().await.map_err(|e| ApiError::NetworkError {
            message: e.to_string(),
        })?;

        data["choices"][0]["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| ApiError::Unknown {
                message: "No content in Groq response".to_string(),
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use httpmock::prelude::*;

    fn client(server: &MockServer) -> GroqApiClient {
        // Override the hardcoded URL by pointing the reqwest client at the mock server.
        // GroqApiClient::new creates an internal client but the URL is hardcoded in chat_completion.
        // We expose a test constructor that accepts a base_url override.
        GroqApiClient::new_with_base_url("test-groq-key".to_string(), server.base_url())
    }

    #[tokio::test]
    async fn chat_completion_success_returns_content() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(POST).path("/openai/v1/chat/completions");
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"{"choices":[{"message":{"content":"{\"insights\":[],\"summary\":\"OK\"}"}}]}"#);
        });

        let result = client(&server).chat_completion("analyze this").await.unwrap();
        assert!(result.contains("insights"));
    }

    #[tokio::test]
    async fn chat_completion_401_returns_network_error() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(POST).path("/openai/v1/chat/completions");
            then.status(401);
        });

        let err = client(&server).chat_completion("test").await.unwrap_err();
        assert!(matches!(err, ApiError::NetworkError { .. }));
    }

    #[tokio::test]
    async fn chat_completion_500_returns_network_error() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(POST).path("/openai/v1/chat/completions");
            then.status(500);
        });

        let err = client(&server).chat_completion("test").await.unwrap_err();
        assert!(matches!(err, ApiError::NetworkError { .. }));
    }

    #[tokio::test]
    async fn chat_completion_missing_content_returns_unknown() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(POST).path("/openai/v1/chat/completions");
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"{"choices":[{"message":{}}]}"#);
        });

        let err = client(&server).chat_completion("test").await.unwrap_err();
        assert!(matches!(err, ApiError::Unknown { .. }));
    }

    #[tokio::test]
    async fn chat_completion_sends_authorization_header() {
        let server = MockServer::start();
        let mock = server.mock(|when, then| {
            when.method(POST)
                .path("/openai/v1/chat/completions")
                .header("Authorization", "Bearer test-groq-key");
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"{"choices":[{"message":{"content":"ok"}}]}"#);
        });

        let _ = client(&server).chat_completion("test").await;
        mock.assert();
    }
}
