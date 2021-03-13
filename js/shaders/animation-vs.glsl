Shader.source[document.currentScript.src.split('js/shaders/')[1]] = `#version 300 es
  in vec4 vertexPosition;
  in vec4 vertexTexCoord;
  out vec4 texCoord;
  out vec4 modelPosition;

  uniform struct{
    mat4 modelMatrix;
    vec4 offset;
  } gameObject;

  uniform struct{
    mat4 viewProjMatrix;
  } camera;

  void main(void) {
    modelPosition = vertexPosition;
    texCoord = (vertexTexCoord+gameObject.offset)*(1.0/6.0);
    gl_Position = vertexPosition;
    gl_Position *= gameObject.modelMatrix;
    gl_Position *= camera.viewProjMatrix;
  }
`;