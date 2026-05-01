#[tokio::main]
async fn main() -> Result<(), jtype_web::AppError> {
    jtype_web::run_from_env().await
}
