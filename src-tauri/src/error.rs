#[derive(Debug, serde::Serialize, thiserror::Error)]
pub enum ApiError {
    #[error("Not found: {message}")]
    NotFound { message: String },
    #[error("Rate limited, retry after {retry_after}s")]
    RateLimited { retry_after: u64 },
    #[error("Invalid API key")]
    ApiKeyInvalid,
    #[error("Network error: {message}")]
    NetworkError { message: String },
    #[error("Database error: {message}")]
    DatabaseError { message: String },
    #[error("Request timed out")]
    Timeout,
    #[error("Feature not configured: {feature}")]
    NotConfigured { feature: String },
    #[error("Unknown error: {message}")]
    Unknown { message: String },
}
