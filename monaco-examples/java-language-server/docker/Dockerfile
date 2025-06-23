FROM eclipse-temurin:17-jdk

ARG HOME_DIR=/home/jdtls
ARG PATH_ECLIPSE_JDT=${HOME_DIR}/eclipse-jdt-ls
ARG JDT_TAR_URL=https://download.eclipse.org/jdtls/milestones/1.37.0/jdt-language-server-1.37.0-202406271335.tar.gz
ARG JDT_TAR_LOCAL=eclipse.jdt.ls.tar.gz

# Install required packages
RUN apt update && apt upgrade -y
RUN apt install -y wget curl

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

# Download and extract Eclipse JDT LS
RUN cd ${PATH_ECLIPSE_JDT} \
    && wget -O ${JDT_TAR_LOCAL} ${JDT_TAR_URL} \
    && tar -xzf ${JDT_TAR_LOCAL} \
    && rm ${JDT_TAR_LOCAL}

# Copy server files
COPY server.js ${HOME_DIR}/
COPY package.json ${HOME_DIR}/

# Install Node.js dependencies
WORKDIR ${HOME_DIR}
RUN npm install

# Set working directory and expose port
WORKDIR ${HOME_DIR}
EXPOSE 30003

CMD ["node", "server.js"]
