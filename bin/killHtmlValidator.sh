#!/bin/bash
portArg=$1
lsof -t -i:${portArg} | kill -9 $(lsof -t -i:${portArg})