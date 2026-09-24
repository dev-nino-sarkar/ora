# Section: Pain & Symptoms

## Q1 | radio | required
Do you experience pain in your knees?
- Never
- Sometimes (1-2 times/week)
- Often (3-5 times/week)
- Always (daily)

## Q2 | scale | required | min:0 | max:10 | minLabel:No Pain | maxLabel:Worst Pain
Rate your average pain level over the last 7 days.

## Q3 | multiselect | required
Which activities aggravate the pain?
- Walking on flat ground
- Climbing stairs
- Squatting
- Standing for long periods
- Getting up from a chair
- None of the above

## Q4 | text | optional | maxLength:500
Describe the location and nature of the pain (e.g., left knee, sharp, morning stiffness).

## Q5 | radio | required | dependsOn:Q1 | showIf:Sometimes (1-2 times/week),Often (3-5 times/week),Always (daily)
Has the pain worsened in the past 3 months?
- Yes, significantly
- Yes, slightly
- No change
- It has improved

# Section: Stiffness & Mobility

## Q6 | radio | required
Do you experience joint stiffness in the morning?
- No
- Less than 30 minutes
- 30 minutes to 1 hour
- More than 1 hour

## Q7 | radio | required
Can you climb a flight of stairs without support?
- Yes, easily
- Yes, with difficulty
- Only with support (handrail/person)
- No, unable to

## Q8 | radio | required
Can you squat fully (heels on ground)?
- Yes, easily
- Yes, with some pain
- Partially only
- No

# Section: Swelling & Physical Signs

## Q9 | radio | required
Have you noticed swelling around your knee joint?
- Never
- Occasionally
- Frequently
- Constantly

## Q10 | radio | required
Do you hear a clicking or grinding sound from your knee?
- Never
- Sometimes
- Often
- Always

## Q11 | multiselect | optional
Have you had any of the following in the past 6 months?
- Physiotherapy or exercise therapy
- Knee injection (cortisone/HA)
- Pain medication (regular use)
- Knee brace / support
- None of the above

# Section: Functional Impact

## Q12 | scale | required | min:0 | max:10 | minLabel:No Difficulty | maxLabel:Completely Unable
How much difficulty do you have with daily activities overall?

## Q13 | radio | required
How has your condition affected your ability to work?
- No impact
- Minor impact
- Significant impact, still working
- Unable to work due to knee condition

## Q14 | text | optional | maxLength:300
Any additional information you would like the clinician to know?
