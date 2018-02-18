# Serverless DOM scraper

Scrape DOM from website by Chrome after everything is loaded (include JS) - powered by Serverless.

### Requirements

- [Install the Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/installation/)
- [Configure your AWS CLI](https://serverless.com/framework/docs/providers/aws/guide/credentials/)

### Installation

To create a new Serverless project with ES7 support.

``` bash
$ sls install --url https://github.com/michalsn/sls-chrome-dom --name my-project
```

Enter the new directory

``` bash
$ cd my-project
```

Install the Node.js packages

``` bash
$ npm install
```

### Usage

Deploy your project

``` bash
$ sls deploy
```

To add another function as a new file to your project, simply add the new file and add the reference to `serverless.yml`. The `webpack.config.js` automatically handles functions in different files.

Go to generated endpoint with query string ie: `dom?url=https://google.com`

### Thanks

- [Serverless Node.js Starter](https://github.com/AnomalyInnovations/serverless-nodejs-starter)
- [Serverless Chrome](https://github.com/adieuadieu/serverless-chrome)
