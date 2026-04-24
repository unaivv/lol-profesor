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
