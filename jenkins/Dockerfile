# Stage 1: Obtain Docker CLI
FROM docker:29.9.3-cli AS docker-cli

# Stage 2: Jenkins with Docker CLI
FROM jenkins/jenkins:2.580.2-jdk21

USER root

# Copy Docker CLI into Jenkins
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

# Install required Jenkins plugins
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt

RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER jenkins
