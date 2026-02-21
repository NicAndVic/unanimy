# Unanimy API quick examples

## Create decision

```bash
curl -X POST http://localhost:3000/api/decisions \
  -H 'content-type: application/json' \
  -d '{
    "location": {"latitude": 37.7749, "longitude": -122.4194},
    "radiusMeters": 2500,
    "maxOptions": 6,
    "algorithm": "collective",
    "allowVeto": true
  }'
```

## Join decision by code

```bash
curl -X POST http://localhost:3000/api/join \
  -H 'content-type: application/json' \
  -d '{"code":"ABCDE"}'
```

## Vote

```bash
curl -X POST http://localhost:3000/api/decisions/<decision_id>/votes \
  -H 'content-type: application/json' \
  -H 'x-participant-token: <participant_token>' \
  -d '{"decisionItemId":"<decision_item_id>","vote":"Preferred"}'
```

## Close (organizer only)

```bash
curl -X POST http://localhost:3000/api/decisions/<decision_id>/close \
  -H 'x-participant-token: <organizer_token>'
```
