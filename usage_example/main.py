#!/bin/python3
# -*- coding: utf-8 -*-

"""Usage example written in Python 3."""

import requests

url = f"http://localhost:5000?url={target_website}"

response = requests.get(url)

if __name__ == '__main__':
  from_lang: str = input('Translate from: ').lower() # for example, "ru"
  to_lang: str = input('Translate to: ').lower()
  text: str = input('Your text: ')

  url: str = f"http://localhost:5000?from={from_lang}&to={to_lang}&content={text}"

  response = requests.get(url)
  data = response.json()

  if response.status_code == 200:
    print(data.get('content'))
  else:
    print("Error:", data.get("content"))
