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

## Web UI flow (App Router)

1. Open `/create`, fill in coordinates and preferences, then submit to create a decision.
2. Save the generated token in local storage (`unanimy:pt:<decisionId>`) and share the join code.
3. Participants visit `/join`, enter the code, and are redirected to `/d/<decisionId>`.
4. Everyone votes on each option, then presses **Complete voting**.
5. View the winner and decision summary on `/d/<decisionId>/result`.

### Local UI test steps

1. Start the app: `cd web && npm run dev`.
2. Create a decision at `http://localhost:3000/create`.
3. Join from another tab/device at `http://localhost:3000/join?code=<JOIN_CODE>`.
4. Vote in both sessions and complete voting.
5. Confirm the result page shows winner details and counts.
