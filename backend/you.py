# your_custom_script.py

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import JSONFormatter
video_id = 'Ef1LfGsS1vFbGQUZ'  # Replace with your YouTube video ID
ytt_api = YouTubeTranscriptApi()
transcript = ytt_api.fetch(video_id)

formatter = JSONFormatter()

# .format_transcript(transcript) turns the transcript into a JSON string.
json_formatted = formatter.format_transcript(transcript)

# Now we can write it out to a file.
with open('your_filename.json', 'w', encoding='utf-8') as json_file:
    json_file.write(json_formatted)

# Now should have a new JSON file that you can easily read back into Python.