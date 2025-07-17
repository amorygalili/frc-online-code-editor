# Production Dockerfile for FRC Challenge Runtime
# Self-contained within infrastructure folder

# Use the pre-built WPILib base image that already contains:
# - Eclipse JDT Language Server
# - WPILib 2025 installation
# - Node.js and all dependencies
# - Configured frcuser and environment
FROM agalili/wpilib-2025-base:v6

# Set production environment variables
ENV NODE_ENV=production
ENV JAVA_OPTS="-Xmx1536m"

# Expose the required ports for ECS
EXPOSE 30003 30004 30005 30006

# Set working directory
WORKDIR /home/frcuser

# Use the same command as the original DockerfileProd
CMD ["npm", "start", "--prefix", "server"]

# Labels for better container management in ECS
LABEL maintainer="FRC Challenge Site Team"
LABEL version="1.0"
LABEL description="FRC Challenge Runtime Environment with Monaco Editor and WPILib"
LABEL org.opencontainers.image.source="https://github.com/your-org/frc-online-code-editor"
LABEL org.opencontainers.image.title="FRC Challenge Runtime"
LABEL org.opencontainers.image.description="Containerized FRC programming environment for ECS Fargate"
