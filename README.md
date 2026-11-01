# PawPass

Pass or Paws.

PawPass helps a Vancouver skier with a limited pass decide whether this weekend is worth a ski day, or whether the dog gets it.

Live at https://pawpass.tollers.ca

## Run it locally

With Docker (OrbStack or Docker Desktop):

```bash
docker compose -f compose.dev.yml up
```

Then open http://localhost:3000.

Tests:

```bash
docker compose -f compose.dev.yml run --rm dev npm test
```
