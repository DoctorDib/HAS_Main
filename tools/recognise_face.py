import re
import os
import cv2
import json
import face_recognition

import numpy as np

# Get a reference to webcam #0 (the default one)
video_capture = cv2.VideoCapture(0)

_, frame1 = video_capture.read()
_, frame2 = video_capture.read()

known_face_encodings = [ ]
known_face_names = [ ]

## LOADING IN CONFIG DATA
with open('../config.json') as json_file:  
    data = json.load(json_file)
    owner = data["owner"]
    maxTick = data["max_owner_tick"]

ownerTick=0
randomPerson=0

sdThresh = 10

def distMap(frame1, frame2):
    """outputs pythagorean distance between two frames"""
    frame1_32 = np.float32(frame1)
    frame2_32 = np.float32(frame2)
    diff32 = frame1_32 - frame2_32
    norm32 = np.sqrt(diff32[:,:,0]**2 + diff32[:,:,1]**2 + diff32[:,:,2]**2)/np.sqrt(255**2 + 255**2 + 255**2)
    dist = np.uint8(norm32*255)
    return dist

# Set up faces
for file in os.listdir(os.fsencode("../accounts")):
    filename = os.fsdecode(file)
    if filename.endswith(".jpg"):
        name = filename.split('.')[0]
        
        print(name)
        
        known_face_encodings.append(face_recognition.face_encodings(face_recognition.load_image_file("../accounts/" + name + ".jpg"))[0])
        
        name = re.split(r'\d', name)[0]
        print(name)
        
        known_face_names.append(name)
        
        print(name)
        continue


motionActive=False
motionTick=0
maxMotionTick=10
        
while True:
    # Grab a single frame of video
    ret, frame = video_capture.read()

    rows, cols, ret = np.shape(frame)
    dist = distMap(frame1, frame)

    frame1 = frame2
    frame2 = frame

    # apply Gaussian smoothing
    mod = cv2.GaussianBlur(dist, (9,9), 0)
    # apply thresholding
    ret, thresh = cv2.threshold(mod, 100, 255, 0)
    # calculate st dev test
    ret, stDev = cv2.meanStdDev(mod)
    
    if stDev > sdThresh:
        print("Motion")
        motionActive=True
    elif motionActive:
        motionTick += 1
        if motionTick >= 5:
            print("Deactivated motion")
            motionTick = 0
            motionActive=False
            
            
    if motionActive:
        # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
        rgb_frame = frame[:, :, ::-1]

        # Find all the faces and face enqcodings in the frame of video
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        # Loop through each face in this frame of video
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # See if the face is a match for the known face(s)
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding)

            name = "Unknown"

            

            # Or instead, use the known face with the smallest distance to the new face
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)
            if matches[best_match_index]:
                name = known_face_names[best_match_index]
                if name == owner:
                    print("Owner found")
                    ownerTick += 1
                    if ownerTick >= maxTick:
                        video_capture.release()
                        cv2.destroyAllWindows()
                        break

            # Draw a box around the face
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)

            # Draw a label with a name below the face
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 1.0, (255, 255, 255), 1)
            

    # Display the resulting image
    cv2.imshow('Video', frame)

    # Hit 'q' on the keyboard to quit!
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release handle to the webcam
video_capture.release()
cv2.destroyAllWindows()
