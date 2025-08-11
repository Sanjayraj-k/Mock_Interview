from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi

def get_video_id(url: str) -> str:
    """
    Extract the video ID from a YouTube URL (supports youtube.com and youtu.be)
    """
    parsed_url = urlparse(url)
    if parsed_url.hostname in ("youtu.be",):
        return parsed_url.path.lstrip("/")
    elif parsed_url.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com"):
        return parse_qs(parsed_url.query).get("v", [None])[0]
    else:
        raise ValueError("Invalid YouTube URL format")

def main():
    url = "https://youtu.be/2TL3DgIMY1g?si=5WVPY_NBzZPgp2lE"
    
    try:
        video_id = get_video_id(url)
        print(f"Video ID: {video_id}")
        
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id, languages=["en"])
        paragraph = " ".join(snippet.text for snippet in transcript)
        print(paragraph)
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()