Zion Wakes changelog

2026-11-16, v2026.11.16. Created Zion Wakes, a story and map toy that loads the Agent Test Bed city. You pan and zoom the map and read a short story beat. You can pick a place to move it, name it, approve it, or reject it, and start over with New start. Two follow up builds were triggered to get the first deploy live.

2026-11-23, v2026.11.23. Fixed four playtest bugs. The first load now retries the city fetch up to three times with a 15 second limit each, and shows a Try again button instead of hanging; the missing favicon request no longer returns 404. Move now ends after the tap, clears the prompt, says Moved with the name, and flashes the building; a blocked or hazy spot cancels the move with the reason. Name it opens an in game field with Confirm and Cancel instead of a browser pop up. Street labels sit on the shared edge and are drawn once per edge, so neighboring sections no longer stack them.
