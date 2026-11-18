import onnx
import ast

model = onnx.load("best.onnx")
props = {p.key: p.value for p in model.metadata_props}

if "names" in props:
    print(ast.literal_eval(props["names"]))
else:
    print("Class names are not embedded in this ONNX file metadata.")