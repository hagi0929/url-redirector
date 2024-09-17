PROJECT_DIR=.
IMAGE_NAME=go-redirector
CONTAINER_NAME=go-redirector-container
PORT_MAPPING=80:8080
REDIRECTS_FILE=/path/to/local/redirects.json

build:
	@echo "Building the Docker image..."
	docker build -t $(IMAGE_NAME) $(PROJECT_DIR)

stop:
	@echo "Stopping and removing the old container (if exists)..."
	-docker stop $(CONTAINER_NAME)
	-docker rm $(CONTAINER_NAME)

run:
	@echo "Running the Docker container with the mounted redirects.json..."
	docker run -d -p $(PORT_MAPPING) --name $(CONTAINER_NAME) -v $(REDIRECTS_FILE):/root/redirects.json $(IMAGE_NAME)

update: build stop run
	@echo "Update completed successfully!"
