import requests

url = "https://leetcode.com/graphql"

query = """
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      realName
      ranking
      userAvatar
    }
    submitStats {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
  }
}
"""

variables = {"username": "Sanjayrajk"}  # Replace with your username

response = requests.post(url, json={"query": query, "variables": variables})
data = response.json()

print(data)
