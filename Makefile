PROJECT_DIR=.
IMAGE_NAME=go-redirector
CONTAINER_NAME=go-redirector-container
PORT_MAPPING=80:8080

update:
	@echo "Building the Docker image..."
	docker build -t $(IMAGE_NAME) $(PROJECT_DIR)

	@echo "Stopping and removing the old container..."
	-docker stop $(CONTAINER_NAME)
	-docker rm $(CONTAINER_NAME)

	@echo "Running the new container..."
	docker run -d -p $(PORT_MAPPING) --name $(CONTAINER_NAME) $(IMAGE_NAME)

	@echo "Update completed successfully!"
