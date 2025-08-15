# Magna Carta Middleware Service

This service bridges Salesforce and the NDAQ API for document personalization.

## Quick Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Manual Deployment

1. Clone this repository
2. Install dependencies: `npm install`
3. Deploy to Heroku or run locally: `npm start`

## Configuration

The service will automatically use the NDAQ API endpoints and credentials configured in the code.

## Testing

Run `npm test` to test the service with sample data.

## Endpoints

- `GET /` - Service status page
- `POST /generate-document` - Generate personalized document
- `GET /health` - Health check endpoint