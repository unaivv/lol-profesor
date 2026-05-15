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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_found_display_contains_message() {
        let err = ApiError::NotFound { message: "player xyz not found".to_string() };
        assert!(err.to_string().contains("player xyz not found"));
    }

    #[test]
    fn rate_limited_display_contains_retry_after() {
        let err = ApiError::RateLimited { retry_after: 42 };
        assert!(err.to_string().contains("42"));
    }

    #[test]
    fn not_configured_display_contains_feature() {
        let err = ApiError::NotConfigured { feature: "GROQ_API_KEY".to_string() };
        assert!(err.to_string().contains("GROQ_API_KEY"));
    }

    #[test]
    fn network_error_display_contains_message() {
        let err = ApiError::NetworkError { message: "connection refused".to_string() };
        assert!(err.to_string().contains("connection refused"));
    }

    #[test]
    fn errors_serialize_to_json() {
        let cases: &[ApiError] = &[
            ApiError::NotFound { message: "x".to_string() },
            ApiError::RateLimited { retry_after: 5 },
            ApiError::ApiKeyInvalid,
            ApiError::Timeout,
        ];
        for err in cases {
            let json = serde_json::to_string(err);
            assert!(json.is_ok(), "Error {:?} should serialize to JSON", err);
        }
    }

    #[test]
    fn api_key_invalid_display() {
        let err = ApiError::ApiKeyInvalid;
        assert!(!err.to_string().is_empty());
    }
}
