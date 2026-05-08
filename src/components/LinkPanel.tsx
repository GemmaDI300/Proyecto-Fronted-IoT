import { useState } from "react";
import {
    Box,
    Typography,
    Button,
    Autocomplete,
    TextField,
    CircularProgress,
    Alert,
    Chip,
    Stack,
    Divider,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetQuery, API_BASE_URL } from "../shared/api/functions";
import { SessionCredentials, PageResponse } from "../shared/api/types";
import { buildSignedHeaders } from "../shared/api/requestSigning";
import { isValidId } from "../shared/utils/sanitization";

export interface LinkPanelProps {
    /** Panel heading, e.g. "Gerentes asignados" */
    title: string;
    /** Session for auth headers */
    session: SessionCredentials;
    /** GET endpoint that returns the current links as a plain array */
    listEndpoint: string;
    /** Field name inside each link object that holds the ID of the linked entity, e.g. "manager_id" */
    linkedIdField: string;
    /**
     * "path" → POST `addEndpoint`/`{linkedId}` with no body
     * "body" → POST `addEndpoint` with JSON body `{ [addBodyKey]: linkedId }`
     */
    addMode: "path" | "body";
    /** Base URL for the ADD request */
    addEndpoint: string;
    /** Required when addMode = "body" — the JSON body key, e.g. "user_id" */
    addBodyKey?: string;
    /** DELETE `removeEndpoint`/`{linkedId}` */
    removeEndpoint: string;
    /** GET endpoint for the pool of all entities that can be linked (returns PageResponse) */
    allItemsEndpoint: string;
    /** How to build the display label from an entity in allItemsEndpoint response */
    getItemLabel: (item: Record<string, unknown>) => string;
}

async function callLink(
    url: string,
    method: "POST" | "DELETE",
    token: string,
    body?: Record<string, unknown>
): Promise<void> {
    const bodyJson = body ? JSON.stringify(body) : undefined;
    const sigHeaders = await buildSignedHeaders(token, bodyJson ?? "").catch(() => ({}));
    const response = await fetch(url, {
        method,
        headers: {
            ...(bodyJson ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`,
            ...sigHeaders,
        },
        body: bodyJson,
    });
    if (!response.ok && response.status !== 204) {
        const raw = await response.text();
        let msg = `Error ${response.status}`;
        try {
            const j = JSON.parse(raw);
            if (j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
        } catch { /* keep default msg */ }
        throw new Error(msg);
    }
}

export default function LinkPanel({
    title,
    session,
    listEndpoint,
    linkedIdField,
    addMode,
    addEndpoint,
    addBodyKey,
    removeEndpoint,
    allItemsEndpoint,
    getItemLabel,
}: LinkPanelProps) {
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<{ label: string; value: string } | null>(null);
    const [mutationError, setMutationError] = useState<string | null>(null);

    // Current links (plain array)
    const {
        data: links,
        isLoading: linksLoading,
        isError: linksError,
    } = useGetQuery<Array<Record<string, unknown>>>(listEndpoint, session);

    // All available entities (paginated)
    const { data: allData } = useGetQuery<PageResponse<Record<string, unknown>>>(
        allItemsEndpoint,
        session
    );

    const linkedIds = new Set((links ?? []).map((l) => String(l[linkedIdField] ?? "")));

    const allOptions = (allData?.data ?? []).map((item) => ({
        label: getItemLabel(item),
        value: String(item.id ?? ""),
    }));

    const availableOptions = allOptions.filter((opt) => !linkedIds.has(opt.value));

    const addMutation = useMutation({
        mutationFn: async (linkedId: string) => {
            if (!isValidId(linkedId)) throw new Error("ID inválido");
            const url =
                addMode === "path"
                    ? `${API_BASE_URL}${addEndpoint}/${linkedId}`
                    : `${API_BASE_URL}${addEndpoint}`;
            const body =
                addMode === "body" && addBodyKey
                    ? { [addBodyKey]: linkedId }
                    : undefined;
            await callLink(url, "POST", session.token, body);
        },
        onSuccess: () => {
            setSelected(null);
            setMutationError(null);
            queryClient.invalidateQueries({ queryKey: [listEndpoint, session.token] });
        },
        onError: (err: Error) => setMutationError(err.message),
    });

    const removeMutation = useMutation({
        mutationFn: async (linkedId: string) => {
            if (!isValidId(linkedId)) throw new Error("ID inválido");
            await callLink(
                `${API_BASE_URL}${removeEndpoint}/${linkedId}`,
                "DELETE",
                session.token
            );
        },
        onSuccess: () => {
            setMutationError(null);
            queryClient.invalidateQueries({ queryKey: [listEndpoint, session.token] });
        },
        onError: (err: Error) => setMutationError(err.message),
    });

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {title}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            {linksLoading && <CircularProgress size={20} />}
            {linksError && <Alert severity="error">Error al cargar vínculos</Alert>}

            {/* Current linked items */}
            <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
                {(links ?? []).length === 0 && !linksLoading && (
                    <Typography variant="body2" color="text.secondary">
                        Sin vínculos aún
                    </Typography>
                )}
                {(links ?? []).map((link) => {
                    const linkedId = String(link[linkedIdField] ?? "");
                    const opt = allOptions.find((o) => o.value === linkedId);
                    const label = opt?.label ?? linkedId;
                    return (
                        <Chip
                            key={String(link.id ?? linkedId)}
                            label={label}
                            onDelete={() => removeMutation.mutate(linkedId)}
                            deleteIcon={<LinkOffIcon fontSize="small" />}
                            disabled={removeMutation.isPending}
                            size="small"
                            variant="outlined"
                        />
                    );
                })}
            </Stack>

            {/* Add new link */}
            <Stack direction="row" gap={1} alignItems="center">
                <Autocomplete
                    size="small"
                    options={availableOptions}
                    getOptionLabel={(opt) => opt.label}
                    value={selected}
                    onChange={(_, val) => setSelected(val)}
                    renderInput={(params) => (
                        <TextField {...params} label="Agregar vínculo" sx={{ minWidth: 260 }} />
                    )}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                />
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<LinkIcon />}
                    disabled={!selected || addMutation.isPending}
                    onClick={() => selected && addMutation.mutate(selected.value)}
                    sx={{ textTransform: "none", fontWeight: 600, whiteSpace: "nowrap" }}
                >
                    Vincular
                </Button>
            </Stack>

            {mutationError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                    {mutationError}
                </Alert>
            )}
        </Box>
    );
}
