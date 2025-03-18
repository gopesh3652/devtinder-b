# DevTinder API's

## authRouter

- POST /signup
- POST /login
- POST /logout

## profileRouter

- GET /profile/view
- PATCH /profile/edit
- PATCH /profile/password

## connectionRequestRouter - request

status == ["ignored", "interested", "accepted", "rejected"]

- POST /request/send/:status/:userId
- POST /request/review/:status/:requestId

## userRouter

- GET /user/connections
- GET /user/requests/reveived
- GET /user/feed
