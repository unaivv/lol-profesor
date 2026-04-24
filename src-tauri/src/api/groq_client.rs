use crate::error::ApiError;
use serde_json::json;

pub struct GroqApiClient {
    client: reqwest::Client,
    api_key: String,
}

impl GroqApiClient {
    pub fn new(api_key: String) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .expect("Failed to create Groq HTTP client");
        Self { client, api_key }
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
            .post("https://api.groq.com/openai/v1/chat/completions")
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
