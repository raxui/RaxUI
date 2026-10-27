# File upload examples

Install `file-upload` and `button`, then copy `FileUploadExamples.razor` into your app. Uses the same shared theme/CSS as React. `Arabic` switches the main example text; a separate Arabic dropzone is always shown.

The four examples match react-test: a three-at-a-time upload queue, compact photo grid, CV form with validation/replacement/reset, and Arabic attachments. Names containing `fail` fail once. Uploads are simulated locally; no service receives the files. The callback reads one byte to exercise retained browser-file handles across picker batches.

For the initial three photos, pass `InitialPhotos` containing `FileUploadExamples.SamplePhoto` objects, and serve their URLs. SheenDemo uses the same coffee, astronaut and cat assets from react-test's `public/avatars`. Without initial photos the grid starts empty.
