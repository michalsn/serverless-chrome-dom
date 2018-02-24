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

### Endpoints

By default all endpoints returns `text/html` - with "flat" data. Full informations are returned only if we ask for `application/json` content type.

#### dom

---

**GET**
Query string parameters:

* **url** - (required) - URL address
* **logBlocked** - (optional) - Display blocked resources. Values: `1` or `0`
* **proxy** - (optional) - Proxy server address
* **proxyUsername** - (optional) - Proxy username
* **proxyPassword** - (optional) - Proxy password

`curl -X GET 'https://your-lambda-address-here/dom?url=https://google.com&logBlocked=1' -H 'Content-Type: application/json'`

Sample result *(Code 200)*:

```
#!json

{
    "status": true,
    "data": "some HTML"
    "url": "https://www.google.com/",
    "blockedContentLog": [
        "https://www.google.com/logos/doodles/2018/doodle-snow-games-day-16-5525914497581056.2-s.png",
        "https://fonts.gstatic.com/s/roboto/v18/CWB0XYA8bzo0kSThX0UTuA.woff2",
        ...
    ]
}
```

#### version

---

**GET**

`curl -X GET 'https://your-lambda-address-here/version' -H 'Content-Type: application/json'`

Sample result *(Code 200)*:

```
#!json

{
    "version": "HeadlessChrome/64.0.3282.167"
}
```

### Thanks

- [Serverless Node.js Starter](https://github.com/AnomalyInnovations/serverless-nodejs-starter)
- [Serverless Chrome](https://github.com/adieuadieu/serverless-chrome)
