use crate::error::ApiError;

#[derive(Clone)]
pub struct RiotApiClient {
    client: reqwest::Client,
    regional_url: String,
    global_url: String,
    api_key: String,
}

impl RiotApiClient {
    pub fn new(regional_url: String, global_url: String, api_key: String) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        Self {
            client,
            regional_url,
            global_url,
            api_key,
        }
    }

    pub async fn get<T: serde::de::DeserializeOwned>(&self, url: &str) -> Result<T, ApiError> {
        let mut last_err = ApiError::Unknown {
            message: "No attempts made".to_string(),
        };

        for attempt in 0..3u32 {
            let result = self
                .client
                .get(url)
                .header("X-Riot-Token", &self.api_key)
                .send()
                .await;

            match result {
                Err(e) if e.is_timeout() => {
                    last_err = ApiError::Timeout;
                    break;
                }
                Err(e) => {
                    last_err = ApiError::NetworkError {
                        message: e.to_string(),
                    };
                    // exponential backoff: 500ms, 1000ms, 2000ms
                    if attempt < 2 {
                        tokio::time::sleep(std::time::Duration::from_millis(
                            500 * 2u64.pow(attempt),
                        ))
                        .await;
                    }
                    continue;
                }
                Ok(resp) => {
                    let status = resp.status();
                    if status == 403 {
                        return Err(ApiError::ApiKeyInvalid);
                    }
                    if status == 404 {
                        return Err(ApiError::NotFound {
                            message: format!("Resource not found: {}", url),
                        });
                    }
                    if status == 429 {
                        let retry_after: u64 = resp
                            .headers()
                            .get("Retry-After")
                            .and_then(|v| v.to_str().ok())
                            .and_then(|v| v.parse().ok())
                            .unwrap_or(5);
                        last_err = ApiError::RateLimited { retry_after };
                        if attempt < 2 {
                            tokio::time::sleep(std::time::Duration::from_secs(retry_after))
                                .await;
                        }
                        continue;
                    }
                    if !status.is_success() {
                        last_err = ApiError::NetworkError {
                            message: format!("HTTP {}: {}", status.as_u16(), url),
                        };
                        if attempt < 2 {
                            tokio::time::sleep(std::time::Duration::from_millis(
                                500 * 2u64.pow(attempt),
                            ))
                            .await;
                        }
                        continue;
                    }

                    let text = resp.text().await.map_err(|e| ApiError::NetworkError {
                        message: format!("Failed to read response body: {}", e),
                    })?;
                    log::debug!("Riot response for {}: {}", &url[..url.len().min(80)], &text[..text.len().min(300)]);
                    return serde_json::from_str::<T>(&text).map_err(|e| ApiError::NetworkError {
                        message: format!("Deserialize error: {} | body snippet: {}", e, &text[..text.len().min(200)]),
                    });
                }
            }
        }

        Err(last_err)
    }

    pub fn regional_url(&self) -> &str {
        &self.regional_url
    }

    pub fn global_url(&self) -> &str {
        &self.global_url
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use httpmock::prelude::*;

    fn client(server: &MockServer) -> RiotApiClient {
        RiotApiClient::new(server.base_url(), server.base_url(), "test-key".to_string())
    }

    #[tokio::test]
    async fn get_200_parses_json() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/test/endpoint").header("X-Riot-Token", "test-key");
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"{"puuid":"abc123","gameName":"TestPlayer","tagLine":"EUW"}"#);
        });

        let url = format!("{}/test/endpoint", server.base_url());
        let result: serde_json::Value = client(&server).get(&url).await.unwrap();

        assert_eq!(result["puuid"], "abc123");
        assert_eq!(result["gameName"], "TestPlayer");
    }

    #[tokio::test]
    async fn get_404_returns_not_found() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/missing");
            then.status(404);
        });

        let url = format!("{}/missing", server.base_url());
        let err = client(&server).get::<serde_json::Value>(&url).await.unwrap_err();
        assert!(matches!(err, ApiError::NotFound { .. }));
    }

    #[tokio::test]
    async fn get_403_returns_api_key_invalid() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/forbidden");
            then.status(403);
        });

        let url = format!("{}/forbidden", server.base_url());
        let err = client(&server).get::<serde_json::Value>(&url).await.unwrap_err();
        assert!(matches!(err, ApiError::ApiKeyInvalid));
    }

    #[tokio::test]
    async fn get_429_returns_rate_limited_with_retry_after() {
        let server = MockServer::start();
        // Return 429 for all 3 attempts — Retry-After: 0 makes sleep instant
        server.mock(|when, then| {
            when.method(GET).path("/rate-limited");
            then.status(429).header("Retry-After", "0");
        });

        let url = format!("{}/rate-limited", server.base_url());
        let err = client(&server).get::<serde_json::Value>(&url).await.unwrap_err();
        match err {
            ApiError::RateLimited { retry_after } => assert_eq!(retry_after, 0),
            other => panic!("Expected RateLimited, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn get_429_uses_default_retry_after_when_header_missing() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/rate-limited-no-header");
            then.status(429); // no Retry-After header
        });

        let url = format!("{}/rate-limited-no-header", server.base_url());
        let err = client(&server).get::<serde_json::Value>(&url).await.unwrap_err();
        match err {
            ApiError::RateLimited { retry_after } => assert_eq!(retry_after, 5),
            other => panic!("Expected RateLimited, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn get_sends_api_key_header() {
        let server = MockServer::start();
        let mock = server.mock(|when, then| {
            when.method(GET).path("/key-check").header("X-Riot-Token", "test-key");
            then.status(200).body(r#"{"ok":true}"#);
        });

        let url = format!("{}/key-check", server.base_url());
        let _: serde_json::Value = client(&server).get(&url).await.unwrap();
        mock.assert();
    }

    #[tokio::test]
    async fn get_match_ids_parses_array() {
        let server = MockServer::start();
        server.mock(|when, then| {
            when.method(GET).path("/match-ids");
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"["EUW1_100","EUW1_101","EUW1_102"]"#);
        });

        let url = format!("{}/match-ids", server.base_url());
        let ids: Vec<String> = client(&server).get(&url).await.unwrap();
        assert_eq!(ids.len(), 3);
        assert_eq!(ids[0], "EUW1_100");
    }
}
