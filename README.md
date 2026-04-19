# demand-scope

A personal Python tool for analyzing business ideas by examining relevant discussions on Reddit.

## Overview

When I'm exploring a potential business idea or content direction, I want to understand:
- Are people discussing this topic on Reddit?
- What are they complaining about?
- Where are the gaps in existing solutions?
- How reliable is Reddit as a signal source for this particular market?

demand-scope takes a short business description as input and produces a diagnostic report based on relevant Reddit discussions.

## How it works

1. User inputs a business description (50-200 words)
2. An LLM generates 3-5 relevant search keywords
3. PRAW retrieves public Reddit posts and top comments matching those keywords
4. The LLM analyzes the content and produces a report with:
   - Platform Adequacy Score (is Reddit actually the right signal source for this market?)
   - Demand Level (peak / moderate / low)
   - Demand Type (unmet-supply / unknown / satisfied)
   - Potential Gaps with supporting quotes

## Status

Pre-development. Currently requesting non-commercial Reddit Data API access.

## Design principle

The tool must honestly declare its own limitations. Reddit is not a universally good signal source — visual/aspirational markets often have their user base elsewhere (Pinterest, Instagram). The Platform Adequacy Score is intentionally placed first in the output to prevent users from over-trusting results for ill-suited markets.

## Tech stack

- Python 3.11+
- PRAW (Reddit API wrapper)
- Anthropic Claude API (claude-sonnet-4)
- Streamlit (local UI)

## Non-commercial

This is a personal, single-user, read-only tool. Not distributed, not monetized, not used for AI training.
