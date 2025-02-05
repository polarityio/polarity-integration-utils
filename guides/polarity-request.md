---
title: Polarity Request
group: Documents
category: Guides
---

The Polarity Integration Utils library provides a set of utilities to help you build integrations quickly and efficiently for Polarity.  The core of the library is the {@link PolarityRequest} class which provides a simple interface for making HTTP requests and handling responses.

# Setup

To start, you will need to `require` the `PolarityRequest` class at the top of your `integration.js` file.

```
const { PolarityRequest } = require('polarity-integration-utils/requests');
```

Typically, you will want to create a single instance of the `PolarityRequest` class and use that instance for all of your requests.  You can do this by creating a new instance in the `startup` method of your integration.

```js
let request;

function startup(logger){
  setLogger(logger);
  request = new PolarityRequest();
}
```

You now have access to the `request` object throughout the `integration.js` file.

Note the use of {@link setLogger} here from the logging utilities module.  Setting the logger within your `startup` method is important as it will ensure that all logging from the `PolarityRequest` class is properly logged to the integration's log file.

Within your `doLookup` method you will want to pass in the `userOptions` to the `request` instance.  This will ensure that the `userOptions` are passed along with each request.  This step should be done before any requests are made.  

```js
function doLookup(entities, options, cb) {
    request.userOptions(options);
}
```

From here you can use either the {@link PolarityRequest.run} or {@link PolarityRequest.runInParallel} methods to make your requests.

If you forget to set `userOptions` calls to {@link PolarityRequest.run} or {@link PolarityRequest.runInParallel} will throw a {@link LibraryUsageError}.

Now that we have the PolarityRequest object created and configured, we'll show an example using the `run` method.  

# Run a single HTTP request

The `run` method runs a single HTTP request based on the provided {@link HttpRequestOptions} object.  The `run` method will return a promise that will resolve to the response from the HTTP request.

As an example, to make a request to the GitHub API you could do the following:

```js
const response = await request.run({
    url: 'https://api.github.com/users/octocat',
});
```

The `response` is a {@link HttpRequestResponse} object which contains a `body` property that has the response body.  By default, the PolarityRequest class will attempt to parse the response body as JSON. In cases where
the response body is not JSON, you can set the `json` property on the `HttpRequestOptions` object to `false`.

The HTTP request is considered successful if any 2xx status code is returned.  In the event a non-2xx status code is returned, the `run` method will throw an {@link ApiRequestError} that you should catch and handle appropriately.  
In the event of a network error (e.g., DNS lookup failure, connection timeout, etc.), the `run` method will throw a {@link NetworkError}.

```js
try {
  const response = await request.run({
    url: 'https://api.github.com/users/octocat',
  });
} catch (error) {
  if(error instanceof ApiRequestError) {
    // handle API request error
  } else if(error instanceof NetworkError) {
    // handle network errors
  } else {
    // handle other errors
  }
}
```

# Modifying Request Behavior

## Modify Success HTTP Status Codes

By default, the PolarityRequest class will consider any 2xx status code as a successful response.  You can modify this behavior by setting the `successStatusCodes` property when creating the `PolarityRequest` instance.

For example, if you also wanted to treat 400 responses as successful (i.e., not throw an {@link ApiRequestError}), you could do the following:

```js
const request = new PolarityRequest({
  // Treat 2xx and 4xx status codes as "successful" (i.e., do not throw an ApiRequestError)
  roundedSuccessStatusCodes: [200, 400]
});
```

## Modify Error Properties

Some APIs always return a 200 HTTP Status Code and represent a failure in the response body.  In these cases, you can use the `httpResponseErrorProperties` property to specify the properties that should be considered an error.  You can use JSON dot notation when specifying the path. If any of the specified properties are present in the response body, the `run` method will throw an {@link ApiRequestError}.  For example, if an API returns an HttpStatus of 200 with an error response like this:

```json
{
  "result": {
    "error": {
      "code": 400,
      "message": "Bad Request"
    }    
  }
}
```

You could configure the `PolarityRequest` instance to throw an error if the `result.error.code` property is present in the response body like this:

```js
const request = new PolarityRequest({
  httpResponseErrorProperties: ['result.error.code']
});
```

If more than one property is specified, the `run` method will throw an error if any of the specified properties are present in the response body.

## Modify Error Messages

By default, the `PolarityRequest` class will throw an {@link ApiRequestError} with a message that includes the HTTP status code and response body.  You can modify the error message by setting the `httpResponseErrorMessageProperties` property with a JSON path when creating the `PolarityRequest` instance.  If the provided path is a `string` value, that `string` value will be used as the error message.

For example, if the response payload is like this:

```json
{
  "result": {
    "error": {
      "code": 400,
      "message": "This is a useful error message"
    }    
  }
} 
```

You can configure the `PolarityRequest` instance to throw an error with the message "This is a useful error message" like this:

```js
const request = new PolarityRequest({
  httpResponseErrorMessageProperties: ['result.error.message']
})
```

When an error is encountered, the PolarityRequest instance will look for an error message in the response body using the specified path.  If the path is not found, or the value at the path is not a string, the default error message will be used.  If more than one path is provided, the first path that contains a string will be used. 



## Customize Error Handling

If you need full control over error handling you can implement the `isApiError` method on the `PolarityRequest` instance.  The `isApiError` method receives 

```js

```


