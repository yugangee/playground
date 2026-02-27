import sys

# Read the file
with open('/home/ubuntu/football-analysis/speed_and_distance_estimator/speed_and_distance_estimator.py', 'r') as f:
    content = f.read()

# Replace the division line with a safe version
old_line = "                    speed_meteres_per_second = distance_covered/time_elapsed"
new_line = "                    speed_meteres_per_second = distance_covered/time_elapsed if time_elapsed > 0 else 0"

content = content.replace(old_line, new_line)

# Write back
with open('/home/ubuntu/football-analysis/speed_and_distance_estimator/speed_and_distance_estimator.py', 'w') as f:
    f.write(content)

print("Fixed division by zero issue")
