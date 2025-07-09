FROM eclipse-temurin:17-jdk

ARG HOME_DIR=/home/frcuser
ARG PATH_ECLIPSE_JDT=${HOME_DIR}/eclipse-jdt-ls
ARG JDT_TAR_URL=https://download.eclipse.org/jdtls/milestones/1.37.0/jdt-language-server-1.37.0-202406271335.tar.gz
ARG JDT_TAR_LOCAL=eclipse.jdt.ls.tar.gz
ARG WPILIB_VERSION=2025.3.2

# 1. Optionally switch to a reliable mirror
RUN sed -i 's|archive.ubuntu.com|us.archive.ubuntu.com|g' /etc/apt/sources.list

# 2. Clean up any stale caches
RUN apt-get clean && rm -rf /var/lib/apt/lists/*


# Install required packages including GUI libraries for WPILib
RUN apt update && apt upgrade -y
RUN apt install -y wget curl unzip build-essential \
    libgtk-3-dev libnss3-dev libgbm1 libxss1 \
    libxtst6 libxrandr2 libasound2t64 libpangocairo-1.0-0 \
    libatk1.0-0 libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0

# 4. Install essential tools
RUN apt-get install -y --no-install-recommends wget ca-certificates

# 5. Install desktop environment
RUN apt-get install -y --no-install-recommends xfce4 xfce4-goodies

# 6. Install VNC and headless GUI tools
RUN apt-get install -y --no-install-recommends x11vnc
RUN apt-get install -y --no-install-recommends xvfb
RUN apt-get install -y --no-install-recommends novnc websockify
RUN apt-get install -y --no-install-recommends websockify
RUN apt-get install -y --no-install-recommends sudo
RUN apt-get install -y --no-install-recommends openjdk-17-jdk

# 7. Install additional desktop utilities needed for WPILib
RUN apt-get install -y --no-install-recommends xdg-utils
RUN apt-get install -y --no-install-recommends dbus-x11
RUN apt-get install -y --no-install-recommends at-spi2-core
RUN apt-get install -y --no-install-recommends dos2unix

# 8. Install graphics libraries needed for VS Code
RUN apt-get install -y --no-install-recommends libgbm1
# RUN apt-get install -y --no-install-recommends libasound2
RUN apt-get install -y --no-install-recommends libgtk-3-0
RUN apt-get install -y --no-install-recommends libxss1
# RUN apt-get install -y --no-install-recommends libgconf-2-4
RUN apt-get install -y --no-install-recommends libdrm2
RUN apt-get install -y --no-install-recommends libxcomposite1
RUN apt-get install -y --no-install-recommends libxdamage1
RUN apt-get install -y --no-install-recommends libxrandr2
RUN apt-get install -y --no-install-recommends libnss3
RUN apt-get install -y --no-install-recommends libatk-bridge2.0-0

# 9. Clean up package caches to reduce layer size
RUN rm -rf /var/lib/apt/lists/*

# Create a non-root user for running applications
USER root

# Only create a new user, referencing the existing group by GID
RUN useradd --uid 1001 --create-home --shell /bin/bash frcuser \
 && echo 'frcuser ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/frcuser

# Switch to frcuser for remaining operations
USER frcuser

# Install Node.js using Volta (as root for system-wide installation)
ENV HOME=${HOME_DIR}
ENV VOLTA_HOME=${HOME}/.volta
ENV PATH=${VOLTA_HOME}/bin:${PATH}
SHELL ["/bin/bash", "-c"]

# Install Volta and Node as the non-root user
RUN curl https://get.volta.sh | bash -s -- --skip-setup \
 && volta install node@20


# Create directories
RUN mkdir -p ${HOME_DIR}
RUN mkdir -p ${PATH_ECLIPSE_JDT}
RUN mkdir -p ${HOME_DIR}/workspace
RUN mkdir -p ${HOME_DIR}/wpilib
RUN mkdir -p ${HOME_DIR}/scripts

WORKDIR ${HOME_DIR}

# Download and extract Eclipse JDT LS
RUN cd ${PATH_ECLIPSE_JDT} \
    && wget -O ${JDT_TAR_LOCAL} ${JDT_TAR_URL} \
    && tar -xzf ${JDT_TAR_LOCAL} \
    && rm ${JDT_TAR_LOCAL}

# Download and extract WPILib
RUN cd ${HOME_DIR}/wpilib \
    && wget https://packages.wpilib.workers.dev/installer/v${WPILIB_VERSION}/Linux/WPILib_Linux-${WPILIB_VERSION}.tar.gz \
    && tar -xzf WPILib_Linux-${WPILIB_VERSION}.tar.gz \
    && rm WPILib_Linux-${WPILIB_VERSION}.tar.gz \
    && chmod +x WPILib_Linux-${WPILIB_VERSION}/WPILibInstaller

# Copy server files and utilities
COPY server ${HOME_DIR}/server/
COPY --chmod=755 start.sh ${HOME_DIR}/

# Fix ownership of copied files for frcuser and convert line endings
USER root
RUN dos2unix ${HOME_DIR}/start.sh && \
    chown -R frcuser:frcuser ${HOME_DIR}/server ${HOME_DIR}/start.sh
USER frcuser

# Create VNC directory (password will be set directly in x11vnc command)
RUN mkdir -p ${HOME_DIR}/.vnc

# Set display environment variable and suppress WSL warnings
ENV DISPLAY=:1
ENV DONT_PROMPT_WSL_INSTALL=1

# Install Node.js dependencies
WORKDIR ${HOME_DIR}/server
RUN npm install
WORKDIR ${HOME_DIR}

# Copy robot project and server
USER root
COPY server ${HOME_DIR}/server/
COPY workspace/RobotProject ${HOME_DIR}/workspace/RobotProject

RUN chown -R frcuser:frcuser ${HOME_DIR}/server
RUN chown -R frcuser:frcuser ${HOME_DIR}/workspace
RUN chmod -R 755 /home/frcuser/server
RUN chmod -R 755 /home/frcuser/workspace
USER frcuser

# Install server dependencies
WORKDIR ${HOME_DIR}/server
RUN npm install
WORKDIR ${HOME_DIR}

# Start the container with the custom start script
CMD ["/home/frcuser/start.sh"]
