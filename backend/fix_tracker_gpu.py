import sys

path = '/home/ubuntu/football-analysis/trackers/tracker.py'
with open(path, 'r') as f:
    content = f.read()

old = 'self.model = YOLO(model_path)'
new = '''self.model = YOLO(model_path)
        import torch
        if torch.cuda.is_available():
            self.model.to("cuda")
            print("[TRACKER] Using GPU: CUDA")
        else:
            print("[TRACKER] Using CPU")'''

content = content.replace(old, new, 1)
with open(path, 'w') as f:
    f.write(content)
print("done")
