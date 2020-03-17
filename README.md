# salesforce-event-stream-monitor #
Small app to help me demo Salesforce Shield Event Monitoring by having a web UI that is able to subscribe to events coming out of Salesforce and showing the event payload. 

The app can run either from the command line and as a web application. There is a section for each below.

## CLI ##
Create a `.env` configuration file with the following values:
* `SF_USERNAME`
* `SF_PASSWORD`
* `SF_SECURITY_TOKEN`
```
SF_USERNAME=jdoe-shield@example.com
SF_PASSWORD=Sfsjd28ksjd18§$@
SF_SECURITY_TOKEN=sGb1jlgBWYe5w49NZ1234544Z
```

Build the application and run it.
```
npm run build
npm run cli
```

## Web Application ##
As always it's easiest to simply deploy to Heroku either manually or using the below button. Start by creating a Connected App in your Salesforce org and then configure the app.

1. Create a Connected App in Salesforce
2. [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/lekkimworld/sf-event-stream-monitor)
3. Set the following environment variables in Heroku with appropriate values (either at app creation or afterwards):
    * `SF_CLIENT_ID`
    * `SF_CLIENT_SECRET`
    * `SF_INSTANCE_URL`
    * `SF_CALLBACK_URL`
4. Open the app, login and start streaming events

