# Interview Demo Script

## Two minute walkthrough

1. Open the dashboard and point out that every row is a current Play Store record.
2. Explain the score, category, and data coverage columns.
3. Open one app with the `View` button.
4. Show the observed signals, review themes, source links, and the explanation of the score.
5. Open `Run scan` and use a small limit, such as one app per search and five reviews per app.
6. Explain that the dialog reports live progress and only refreshes after the background scan completes.
7. Show the final message, for example, `Scan complete. Updated 3 app(s).`

## What to say about the score

"The score does not label an app legal or illegal. It summarizes observable public signals in the current sample. The coverage value is separate so low information does not look like a clean result."

## Common questions

### How are fake reviews detected?

The project checks simple signals such as repeated text and extreme rating patterns. It reports an anomaly rather than claiming proof of fake reviews.

### Does the app read a user phone?

No. It reads public Play Store data, public reviews, and public news results. It does not inspect a user's device or private loan information.

### What happens if Google Play is unavailable?

The scan reports failure instead of showing a misleading successful zero-app result. Existing saved data stays visible for review.

### Why does the app need an admin token?

Starting a scan can make many external requests. The token prevents anonymous visitors from repeatedly triggering collection work.
