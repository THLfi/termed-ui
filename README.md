# Termed UI

Termed is a web-based vocabulary and metadata editor. 

Termed UI provides the frontend (JavaScript-based user interface) of the editor.

## Setting up dev environment

Required tools are JDK 8 (preferably Temurin) and Maven 3.8.

First install and start [Termed API](https://github.com/THLfi/termed-api).

Install Node, npm and npm & bower dependencies using frontend-maven-plugin:

```bash
mvn verify
```

Now you can start the application in development mode:

```bash
./node/npm start
```

UI should respond at `http://localhost:8000`.

Note that Termed UI assumes that Termed API is running at `http://localhost:8080`.
