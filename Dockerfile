FROM alpine:3.17

ENV NODE_VERSION 18.16.1

# Install Node.js and npm
RUN apk add --update nodejs npm

WORKDIR /app

# Copy package.json and package-lock.json or pnpm-lock.yaml
COPY package.json .
COPY pnpm-lock.yaml .
# or, if you're using pnpm
# COPY pnpm-lock.yaml .

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy the rest of the application code
COPY . .

EXPOSE 8080

CMD ["pnpm", "prod"]
