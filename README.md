# Git backend on NodeJS

Simple implantation of git http backend on node js.

<!--

encoding
// details: https://www.kernel.org/pub/software/scm/git/docs/technical/protocol-capabilities.txt (side-band)

    // \1 is an error message
    // \2 is a verbose message (default)
    //
    // protip: don't write more than 1000 bytes total per encoding
    // unless you know you are operating over sideband 64k mode

 -->

```bash
$ git init repos/project.git --bare -q
$ git push http://localhost:8000/project.git master
```
