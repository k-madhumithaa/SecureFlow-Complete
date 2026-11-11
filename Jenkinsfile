
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        IMAGE_NAME = 'secureflow'
        PYTHON_IMAGE = 'python:3.13.18-slim-trixie'
        JENKINS_VOLUME = 'jenkins-data'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Source code checked out successfully.'
            }
        }

        stage('Python Tests and Security Scans') {
            steps {
                sh '''
                    docker run --rm \
                      --mount source=${JENKINS_VOLUME},target=/var/jenkins_home \
                      --workdir "${WORKSPACE}" \
                      ${PYTHON_IMAGE} \
                      sh -c '
                        set -e

                        python -m pip install --no-cache-dir \
                          -r backend/requirements.txt \
                          -r security/requirements-security.txt

                        mkdir -p security/reports

                        # Make backend/app importable by the test suite
                        export PYTHONPATH="$PWD/backend"

                        pytest backend/tests -v \
                            --junitxml=backend/test-results.xml
                            
                        bandit -c security/bandit.yaml \
                          -r backend/app \
                          -f json \
                          -o security/reports/bandit.json

                        pip-audit \
                          -r backend/requirements.txt \
                          -f json \
                          -o security/reports/pip-audit.json
                      '
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build \
                      -f docker/Dockerfile \
                      -t ${IMAGE_NAME}:${BUILD_NUMBER} \
                      .
                '''
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                    docker run --rm \
                      --mount source=${JENKINS_VOLUME},target=/var/jenkins_home \
                      --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
                      aquasec/trivy:0.76.2 \
                      image \
                      --ignore-unfixed \
                      --severity HIGH,CRITICAL \
                      --format json \
                      --output "${WORKSPACE}/security/reports/trivy-${BUILD_NUMBER}.json" \
                      ${IMAGE_NAME}:${BUILD_NUMBER}
                '''
            }
        }
    }

    post {
        always {
            junit testResults: 'backend/test-results.xml',
                  allowEmptyResults: true

            archiveArtifacts artifacts: 'security/reports/*.json',
                             allowEmptyArchive: true
        }

        success {
            echo 'SecureFlow CI/CD pipeline completed successfully.'
        }

        failure {
            echo 'SecureFlow CI/CD pipeline failed. Check the stage logs.'
        }
    }
}
