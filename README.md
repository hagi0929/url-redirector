
# Go URL Redirector

This is a simple Go-based URL redirector that maps paths to external URLs and automatically redirects users based on the URL path. It uses Docker for easy deployment.

## Features

- Written in Go for high performance and simplicity.
- Redirects based on URL paths (e.g., `/github` to GitHub, `/portfolio` to your personal website).
- Easily configurable and deployable using Docker.
- Automatic updates via a Makefile for rebuilding the Docker container after changes.

## Usage

### Clone the repository

```bash
git clone https://github.com/yourusername/url-redirector.git
cd url-redirector
```

### Update the redirect paths

Update the `main.go` file to modify the URLs for redirection.

```go
var redirects = map[string]string{
    "github":    "https://github.com/yourusername",
    "portfolio": "https://your-portfolio.com",
    "linkedin":  "https://linkedin.com/in/yourprofile",
}
```

### Build and Run using Docker

You can build and run the redirector as a Docker container:

1. **Build the Docker image:**

```bash
docker build -t go-redirector .
```

2. **Run the Docker container:**

```bash
docker run -d -p 80:8080 --name go-redirector-container go-redirector
```

This will map port 80 on your server to port 8080 inside the Docker container, allowing access to the redirector at `http://your-server-ip/path`.

## Updating the Redirector

Whenever you make changes to the redirect paths or other code, use the Makefile to automate the update process.

1. **SSH into your server:**

```bash
ssh your-username@your-server-ip
```

2. **Run the update:**

```bash
make update
```

This will pull the latest changes from GitHub, rebuild the Docker image, stop the old container, and run the updated container.

## Setting Up Continuous Deployment

For automatic deployment upon code changes, you can use GitHub Actions or other CI/CD tools to pull, build, and restart the container on your server.

## Development

To run the application locally without Docker:

1. **Install Go** on your machine.
2. **Run the application:**

```bash
go run main.go
```

By default, the redirector will listen on port 8080. You can access it at `http://localhost:8080/github`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
