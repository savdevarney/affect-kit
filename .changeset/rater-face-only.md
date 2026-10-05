---
'affect-kit': minor
---

`<affect-kit-rater face-only>`: the face pad without the word chips.

```html
<affect-kit-rater face-only submit-label="Next"></affect-kit-rater>
```

The submit button appears after the first placement. `change` and `commit` carry the face with `labels: []` and `composite: null`, even if `setRating()` was given labels. Face-only stays stacked at every width.

It's for consumers that collect the words another way (a conversation, their own form) and want the pre-verbal gesture as the anchor.
