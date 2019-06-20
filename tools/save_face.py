import cv2
import sys
import time

name = sys.argv[1]

tick=0
max_tick=50

camera = cv2.VideoCapture(0)
while True:
    tick+=1

    return_value,image = camera.read()
    gray = cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
    cv2.imshow('image',gray)
	
    if (tick >= max_tick):
    #if cv2.waitKey(1)& 0xFF == ord('s'):
        cv2.imwrite('accounts/' + name + '.jpg',image)
        break

camera.release()
cv2.destroyAllWindows()