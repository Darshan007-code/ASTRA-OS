import cv2
import os

os.makedirs("face_data", exist_ok=True)

save_path = "face_data/user.jpg"

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Camera not detected.")
    exit()

print("Look at the camera. Press 's' to save your face. Press 'q' to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame.")
        break

    cv2.imshow("Capture Face", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord('s'):
        cv2.imwrite(save_path, frame)
        print("Face saved successfully.")
        break

    if key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()