FROM public.ecr.aws/lambda/python:3.11

# Install image processing dependencies
RUN yum install -y ImageMagick ImageMagick-devel && \
    pip install --upgrade pip && \
    pip install Pillow boto3

COPY handler.py ${LAMBDA_TASK_ROOT}
COPY render.py ${LAMBDA_TASK_ROOT}

CMD ["handler.lambda_handler"]
