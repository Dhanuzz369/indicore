this for running the script to automatically pull the new csv dtata and upload and store it in db 

command:node scripts/batch-import.js

I have created a new setup for exactly this workflow!

I added a new script called 

scripts/batch-import.js
.

How it works:
Every time you have new PDFs converted to CSV by Claude, just save them directly into indicore/scripts/data/pending/.
When you run node scripts/batch-import.js, it will:
Scan the pending folder for all CSV files.
Auto-detect the Exam Name and Year from the filename.
Upload all the questions safely into Appwrite using your existing import-csv.js rules.
When successful, it automatically moves the CSV file from pending into processed so it never accidently uploads duplicate data later.
Naming Convention:
To let the script automatically grab the Exam and Year, name your files using underscores like this before dropping them in the pending folder: 👉 UPSC_2024_geography.csv 👉 SSC_2023_math.csv

The script will see UPSC as the exam and 2024 as the year.

How to run it manually when you are ready:
Once you have dropped your files into the pending folder, just open your terminal and run:

bash
node scripts/batch-import.js

Try putting a test CSV into the new scripts/data/pending folder and run the command to see it in action! Let me know if you need any adjustments to it.

