FROM agalili/wpilib-base:2025.0

ARG HOME_DIR=/home/frcuser

# Copy server files and utilities
COPY server ${HOME_DIR}/server/

# Fix ownership of copied files for frcuser and convert line endings
USER root
RUN chown -R frcuser:frcuser ${HOME_DIR}/server
RUN chmod -R 755 /home/frcuser/server
USER frcuser

# Install Node.js dependencies
WORKDIR ${HOME_DIR}/server
RUN npm install
WORKDIR ${HOME_DIR}

CMD ["npm", "start", "--prefix", "server"]
