FROM mcr.microsoft.com/playwright:v1.47.2-jammy

WORKDIR /app

COPY package*.json ./

COPY . .

RUN npm ci

# Run tests with more verbose output
CMD ["npm", "run", "test", "--reporter=list"]
