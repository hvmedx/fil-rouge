# Jenkins image augmented with the Docker CLI so pipelines can build/push images
# by talking to the host's Docker daemon (socket mounted at runtime).
FROM jenkins/jenkins:lts-jdk17

USER root

# Install Docker CLI (only the client — daemon stays on the host)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg lsb-release git \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Node 20 (handy for running 'npm test' directly on the controller for small jobs)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs unzip \
    && rm -rf /var/lib/apt/lists/*

# Install sonar-scanner CLI (avoids per-build npx download).
# Java is already provided by the Jenkins base image (jdk17).
ARG SONAR_SCANNER_VERSION=5.0.1.3006
RUN curl -fsSL -o /tmp/sonar-scanner.zip \
        "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_SCANNER_VERSION}-linux.zip" \
    && unzip -q /tmp/sonar-scanner.zip -d /opt \
    && ln -s "/opt/sonar-scanner-${SONAR_SCANNER_VERSION}-linux" /opt/sonar-scanner \
    && ln -s /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner \
    && rm /tmp/sonar-scanner.zip

# Add the jenkins user to a 'docker' group whose gid matches the host's docker.sock
# (default 999 on Ubuntu). Override at build time with --build-arg DOCKER_GID=<n>.
ARG DOCKER_GID=999
RUN groupadd -g ${DOCKER_GID} -o docker || groupmod -g ${DOCKER_GID} -o docker \
    && usermod -aG docker jenkins

# Pre-install Jenkins plugins so first boot is fully autonomous
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Skip the setup wizard — we configure with env + JCasC instead
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

USER jenkins
