# Flip Flap spec

flip-flap is supposed to be a simple feature flap system composed of:
- an API to handle the feature flap backend. It should:
  - be a RESTful API
  - a mongoDB database (through docker compose in local) to handle feature flags
  - have a cache system, to avoid query the database each time and give the best performance possible
- a web application
  this app should allow users to manage their feature flags

## Features

### Progressive rollout

Enable a feature flag from 1 to 100%, and / or between two dates, and / or starting at a specific date. example:
  - featureOne:
    - from 2025-10-25 1 AM to 2025-10-30 9 PM: 5% of the requests
    - 2025-10-30 9 PM to 2025-11-03: 25% of the requests, etc.
  - featureTwo:
    - from 2025-10-25: 100% of the requests

### Context based

Enabling or disabling features based on some predictable context, example:
  - featureThree:
    - users based on US and EU only
  - featureFour:
    - users that have created their account in the last 30 days
This feature suppose that the web app allows to enter that kind of feature in the user web interface

### Environments

Handling of different environments, for example, `production`, `staging`, etc.

