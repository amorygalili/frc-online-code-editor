FROM eclipse-temurin:17-jdk

ARG HOME_DIR=/home/jdtls
ARG PATH_ECLIPSE_JDT=${HOME_DIR}/eclipse-jdt-ls
ARG JDT_TAR_URL=https://download.eclipse.org/jdtls/milestones/1.37.0/jdt-language-server-1.37.0-202406271335.tar.gz
ARG JDT_TAR_LOCAL=eclipse.jdt.ls.tar.gz
ARG WPILIB_VERSION=2025.3.2

# Install required packages including GUI libraries for WPILib
RUN apt update && apt upgrade -y
RUN apt install -y wget curl unzip build-essential \
    libgtk-3-dev libnss3-dev libgbm1 libxss1 \
    libxtst6 libxrandr2 libasound2t64 libpangocairo-1.0-0 \
    libatk1.0-0 libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0

# Install Node.js using Volta
RUN curl https://get.volta.sh | bash
ENV VOLTA_FEATURE_PNPM=1
ENV VOLTA_HOME="/root/.volta"
ENV PATH="$VOLTA_HOME/bin:$PATH"
RUN volta install node@20

# Create directories
RUN mkdir -p ${HOME_DIR}
RUN mkdir -p ${PATH_ECLIPSE_JDT}
RUN mkdir -p ${HOME_DIR}/workspace
RUN mkdir -p ${HOME_DIR}/wpilib
RUN mkdir -p ${HOME_DIR}/scripts

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
COPY server.js ${HOME_DIR}/
COPY package.json ${HOME_DIR}/
COPY wpilib-utils.js ${HOME_DIR}/
COPY generate-robot-project.sh ${HOME_DIR}/scripts/
COPY install-wpilib.sh ${HOME_DIR}/scripts/

# Make scripts executable
RUN chmod +x ${HOME_DIR}/scripts/*.sh

# Install Node.js dependencies
WORKDIR ${HOME_DIR}
RUN npm install

# Install WPILib (headless installation)
RUN ${HOME_DIR}/scripts/install-wpilib.sh

# Set working directory and expose port
WORKDIR ${HOME_DIR}
EXPOSE 30003

CMD ["node", "server.js"]
