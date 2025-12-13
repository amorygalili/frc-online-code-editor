FROM agalili/wpilib-2025-base:v6

ENV NODE_ENV=production
ENV JAVA_OPTS="-Xmx1536m"

# Expose the required ports for ECS
EXPOSE 30003 30004 30005 30006

# Set working directory
WORKDIR /home/frcuser

# Use the same command as the original DockerfileProd
CMD ["npm", "start", "--prefix", "server"]
