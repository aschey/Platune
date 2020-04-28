import React, { useState, useEffect } from 'react';
import { Dialog as BlueprintDialog, IDialogProps as BlueprintDialogProps } from "@blueprintjs/core";

interface DialogProps extends BlueprintDialogProps {
    children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = (props: DialogProps) => {
    return <BlueprintDialog {...props} style={{...props.style, boxShadow: 'none', paddingBottom: 0, margin: 0}} className='bp3-dark'>
       {props.children}
    </BlueprintDialog>
}